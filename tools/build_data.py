#!/usr/bin/env python3
"""Build js/data.js and art/ from data/catalog.json and data/shows.json.

    uv run --with pillow tools/build_data.py

Reads only public data: SoundCloud's own web API (the one its player uses) for
each release's artwork, length and link, Spotify's oEmbed for cover art of
releases that are not on SoundCloud, and YouTube's thumbnail for filmed sets.
Answers are kept in tools/.cache so a second run does not ask again
(delete the folder to refresh).
"""
import hashlib
import io
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

from PIL import Image

SITE = pathlib.Path(__file__).resolve().parent.parent
CACHE = SITE / "tools" / ".cache"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
ART_SIZE = 480


def get(url, binary=False):
    CACHE.mkdir(parents=True, exist_ok=True)
    key = CACHE / (hashlib.sha1(url.encode()).hexdigest() + (".bin" if binary else ".txt"))
    if key.exists():
        return key.read_bytes() if binary else key.read_text()
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    data = urllib.request.urlopen(req, timeout=40).read()
    key.write_bytes(data)
    return data if binary else data.decode("utf-8", "replace")


def client_id():
    page = get("https://soundcloud.com/blossomdj")
    for src in reversed(re.findall(r'https://a-v2\.sndcdn\.com/assets/[^"]+\.js', page)):
        m = re.search(r'client_id[:=]"([A-Za-z0-9]{20,})"', get(src))
        if m:
            return m.group(1)
    sys.exit("no client_id found on soundcloud.com")


def slug(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower().replace("&", "and").replace("'", "")).strip("-")
    return s[:60]


def big(url):
    return re.sub(r"-(large|t\d+x\d+)\.", "-t500x500.", url) if url else None


def save_art(url, name):
    """Square webp at ART_SIZE; returns (path, average colour) or (None, None)."""
    if not url:
        return None, None
    try:
        img = Image.open(io.BytesIO(get(url, binary=True))).convert("RGB")
    except Exception as e:  # a missing cover should not stop the build
        print("  no art:", name, e)
        return None, None
    w, h = img.size
    side = min(w, h)
    img = img.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    img = img.resize((ART_SIZE, ART_SIZE), Image.LANCZOS)
    out = SITE / "art" / f"{name}.webp"
    out.parent.mkdir(exist_ok=True)
    img.save(out, "WEBP", quality=80, method=6)
    r, g, b = img.resize((1, 1), Image.BOX).getpixel((0, 0))
    return f"art/{name}.webp", f"#{r:02x}{g:02x}{b:02x}"


def main():
    catalog = json.loads((SITE / "data" / "catalog.json").read_text())["releases"]
    shows = json.loads((SITE / "data" / "shows.json").read_text())
    cid = client_id()
    releases = []
    for row in catalog:
        rel = {k: row[k] for k in ("date", "title", "by", "label", "kind")}
        rel["id"] = slug(row["title"])
        rel["year"] = int(row["date"][:4])
        links, art_url, seconds = {}, None, 0
        if row.get("sc"):
            url = "https://soundcloud.com/" + row["sc"]
            api = ("https://api-v2.soundcloud.com/resolve?" +
                   urllib.parse.urlencode({"url": url, "client_id": cid}))
            try:
                d = json.loads(get(api))
            except Exception as e:
                print("  SoundCloud could not resolve", url, e)
                d = None
            if d:
                links["soundcloud"] = d["permalink_url"]
                seconds = round((d.get("duration") or 0) / 1000)
                art_url = d.get("artwork_url")
                if not art_url and d.get("tracks"):
                    art_url = next((t.get("artwork_url") for t in d["tracks"] if t.get("artwork_url")), None)
                if not art_url:
                    art_url = (d.get("user") or {}).get("avatar_url")
                art_url = big(art_url)
        if row.get("sp"):
            links["spotify"] = "https://open.spotify.com/album/" + row["sp"]
        elif row.get("spt"):
            links["spotify"] = "https://open.spotify.com/track/" + row["spt"]
        if row.get("yt"):
            links["youtube"] = "https://www.youtube.com/watch?v=" + row["yt"]
            art_url = f"https://i.ytimg.com/vi/{row['yt']}/maxresdefault.jpg"
            page = get(links["youtube"])
            m = re.search(r'"uploadDate":"(\d{4}-\d{2}-\d{2})', page) or re.search(r'"publishDate":"(\d{4}-\d{2}-\d{2})', page)
            if m and row.get("nodate"):
                rel["date"], rel["year"] = m.group(1), int(m.group(1)[:4])
            m = re.search(r'"lengthSeconds":"(\d+)"', page)
            if m:
                seconds = int(m.group(1))
        if not art_url and links.get("spotify"):
            try:
                art_url = json.loads(get("https://open.spotify.com/oembed?url=" + urllib.parse.quote(links["spotify"], safe="")))["thumbnail_url"]
            except Exception as e:
                print("  no Spotify cover for", row["title"], e)
        if row.get("more"):
            links["more"] = row["more"]
        rel["links"] = links
        rel["seconds"] = seconds
        if row.get("tracks"):
            rel["tracks"] = row["tracks"]
        rel["art"], rel["tone"] = save_art(art_url, rel["id"])
        releases.append(rel)
        print(f"{rel['date']}  {rel['kind']:8}  {rel['title'][:44]:44}  {seconds // 60:>3}m  {'art' if rel['art'] else 'NO ART'}  {' '.join(links)}")
    releases.sort(key=lambda r: r["date"], reverse=True)
    ids = [r["id"] for r in releases]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        sys.exit(f"two releases share an id: {dup}")
    data = {"releases": releases, "shows": {k: v for k, v in shows.items() if not k.startswith("_")}}
    out = SITE / "js" / "data.js"
    out.write_text("// Generated by tools/build_data.py from data/catalog.json and data/shows.json. Do not edit by hand.\n"
                   "window.BLOSSOM = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    print(f"\n{len(releases)} releases, {len(shows['upcoming'])} upcoming shows -> {out.relative_to(SITE)}")


if __name__ == "__main__":
    main()

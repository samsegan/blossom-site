// cutout <in> <out.png> [maxSide] : subject lift (Vision foreground instance mask) -> PNG with alpha
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else { fputs("usage: cutout in out.png [maxSide]\n", stderr); exit(2) }
let inURL = URL(fileURLWithPath: args[1]), outURL = URL(fileURLWithPath: args[2])
let maxSide = args.count > 3 ? CGFloat(Double(args[3]) ?? 0) : 0
guard var ci = CIImage(contentsOf: inURL, options: [.applyOrientationProperty: true]) else { fputs("cannot read\n", stderr); exit(1) }
if maxSide > 0 {
    let s = maxSide / max(ci.extent.width, ci.extent.height)
    if s < 1 { ci = ci.transformed(by: CGAffineTransform(scaleX: s, y: s)) }
}
let ctx = CIContext()
let handler = VNImageRequestHandler(ciImage: ci)
let req = VNGenerateForegroundInstanceMaskRequest()
do { try handler.perform([req]) } catch { fputs("vision failed: \(error)\n", stderr); exit(1) }
guard let obs = req.results?.first else { fputs("no subject found\n", stderr); exit(1) }
print("instances:", obs.allInstances.count)
let maskBuf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: maskBuf)
let f = CIFilter.blendWithMask()
f.inputImage = ci
f.backgroundImage = CIImage.empty()
f.maskImage = mask
guard let outImg = f.outputImage, let cg = ctx.createCGImage(outImg, from: ci.extent, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!) else { fputs("render failed\n", stderr); exit(1) }
let rep = NSBitmapImageRep(cgImage: cg)
try rep.representation(using: .png, properties: [:])!.write(to: outURL)
print("wrote", outURL.path, cg.width, cg.height)

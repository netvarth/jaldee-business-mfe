/**
 * Face recognition helper (real, browser-side).
 *
 * Uses @vladmandic/face-api with models served from the matching jsdelivr CDN
 * (no model files to bundle). Everything here is imported lazily by the
 * FaceCaptureModal, so the ~heavy tfjs/face-api chunk only loads when a user
 * actually opens the camera — it stays out of the main MFE bundle.
 *
 * Descriptors are 128-float embeddings. We store them as JSON arrays via
 * POST /employees/{id}/face-enrollment and compare with euclidean distance
 * (lower = more similar; < ~0.55 is a confident match).
 */
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/";

let modelsPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsPromise;
}

export async function getDescriptor(input: HTMLVideoElement | HTMLImageElement): Promise<Float32Array | null> {
  const result = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

export function faceDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
  return faceapi.euclideanDistance(a as unknown as number[], b as unknown as number[]);
}

/** Confident-match threshold for euclidean distance between descriptors.
 *  0.60 is face-api's documented default: same-person captures land ~0.3–0.5,
 *  different people > ~0.6. Distances near/above 0.6 usually mean a poor
 *  enrollment frame — re-enroll rather than loosening this further. */
export const FACE_MATCH_THRESHOLD = 0.6;

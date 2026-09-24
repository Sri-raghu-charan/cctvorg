import { describe, it, expect } from 'vitest';
import { VERIFIED_CAMERA_MODELS } from '../../data/cameraModels';

describe('Verified Camera Models Real-World Specifications', () => {
  it('should have comprehensive models from major manufacturers', () => {
    expect(VERIFIED_CAMERA_MODELS.length).toBeGreaterThanOrEqual(20);
    const brands = new Set(VERIFIED_CAMERA_MODELS.map((m) => m.manufacturer));
    expect(brands.has('Hikvision')).toBe(true);
    expect(brands.has('Axis Communications')).toBe(true);
    expect(brands.has('Dahua Technology')).toBe(true);
    expect(brands.has('Hanwha Vision')).toBe(true);
    expect(brands.has('Bosch Security')).toBe(true);
    expect(brands.has('Uniview (UNV)')).toBe(true);
  });

  it('should have valid optical range and FOV for each model', () => {
    for (const model of VERIFIED_CAMERA_MODELS) {
      expect(model.maxOpticalRangeMeters).toBeGreaterThan(0);
      expect(model.maxOpticalRangeMeters).toBeLessThanOrEqual(1500); // realistic PTZ / Long Range max
      expect(model.selectedHfov).toBeGreaterThan(5);
      expect(model.selectedHfov).toBeLessThanOrEqual(180);
      expect(model.selectedVfov).toBeGreaterThan(3);
      expect(model.selectedVfov).toBeLessThanOrEqual(180);
      expect(model.resolutionWidth).toBeGreaterThanOrEqual(1280);
      expect(model.resolutionHeight).toBeGreaterThanOrEqual(720);
      expect(model.sensorSize).toBeDefined();
    }
  });

  it('should have valid datasheet DORI metrics following EN 62676-4 order (detect >= observe >= recognize >= identify)', () => {
    for (const model of VERIFIED_CAMERA_MODELS) {
      expect(model.datasheetDori).toBeDefined();
      const dori = model.datasheetDori!;
      expect(dori.detectMeters).toBeGreaterThan(0);
      expect(dori.observeMeters).toBeGreaterThan(0);
      expect(dori.recognizeMeters).toBeGreaterThan(0);
      expect(dori.identifyMeters).toBeGreaterThan(0);

      // Detection must be farthest, Identification closest
      expect(dori.detectMeters).toBeGreaterThanOrEqual(dori.observeMeters);
      expect(dori.observeMeters).toBeGreaterThanOrEqual(dori.recognizeMeters);
      expect(dori.recognizeMeters).toBeGreaterThanOrEqual(dori.identifyMeters);
    }
  });

  it('should have realistic recommended installation height and tilt angle', () => {
    for (const model of VERIFIED_CAMERA_MODELS) {
      expect(model.recommendedHeight).toBeGreaterThanOrEqual(2);
      expect(model.recommendedHeight).toBeLessThanOrEqual(25);
      expect(model.recommendedTilt).toBeGreaterThanOrEqual(5);
      expect(model.recommendedTilt).toBeLessThanOrEqual(60);
    }
  });

  it('should have consistent varifocal properties for zoom models', () => {
    const varifocalModels = VERIFIED_CAMERA_MODELS.filter(
      (m) => m.lensType === 'motorized_zoom' || (m.focalLengthMax && m.focalLengthMax > (m.focalLengthMin || 0))
    );
    expect(varifocalModels.length).toBeGreaterThan(0);

    for (const model of varifocalModels) {
      expect(model.focalLengthMin).toBeDefined();
      expect(model.focalLengthMax).toBeDefined();
      expect(model.focalLengthMax).toBeGreaterThan(model.focalLengthMin);
      expect(model.hfovMin).toBeDefined();
      expect(model.hfovMax).toBeDefined();
      expect(model.hfovMax).toBeGreaterThan(model.hfovMin);
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AudioEngine } from '../../audio/AudioEngine';
import { useAudioEngine } from '../useAudioEngine';

describe('useAudioEngine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no audio APIs are available (both false)', () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: false,
      oscillator: false,
    });

    const { result } = renderHook(() => useAudioEngine());

    expect(result.current).toBeNull();
  });

  it('returns an AudioEngine instance when speech is supported', () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: true,
      oscillator: false,
    });

    const { result } = renderHook(() => useAudioEngine());

    expect(result.current).toBeInstanceOf(AudioEngine);
  });

  it('returns an AudioEngine instance when only oscillator is supported', () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: false,
      oscillator: true,
    });

    const { result } = renderHook(() => useAudioEngine());

    expect(result.current).toBeInstanceOf(AudioEngine);
  });

  describe('singleton behavior', () => {
    beforeEach(() => {
      vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
        speech: true,
        oscillator: true,
      });
    });

    it('returns the same instance across separate hook renders', () => {
      const first = renderHook(() => useAudioEngine());
      const second = renderHook(() => useAudioEngine());

      expect(first.result.current).not.toBeNull();
      expect(first.result.current).toBe(second.result.current);
    });
  });

  it('calls stop() on unmount for cleanup', () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: true,
      oscillator: true,
    });
    const stopSpy = vi.spyOn(AudioEngine.prototype, 'stop').mockImplementation(() => {});

    const { unmount } = renderHook(() => useAudioEngine());
    expect(stopSpy).not.toHaveBeenCalled();

    unmount();
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });
});

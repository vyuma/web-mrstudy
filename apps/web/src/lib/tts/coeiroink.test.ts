import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Coeiroink, speaker, type Speaker } from './coeiroink';
import createClient from 'openapi-fetch';

// Mock openapi-fetch module
vi.mock('openapi-fetch');

// Mock data
const mockSpeaker: Speaker = {
  name: 'Test Speaker',
  UUID: '550e8400-e29b-41d4-a716-446655440000',
  styles: [
    { styleName: 'Default', styleID: 0 },
    { styleName: 'Happy', styleID: 1 },
  ],
};

const mockAudioData = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x24, 0x00, 0x00, 0x00, // File size
  0x57, 0x41, 0x56, 0x45, // "WAVE"
]);

const mockSpeakers: Speaker[] = [
  mockSpeaker,
  {
    name: 'Another Speaker',
    UUID: '660e8400-e29b-41d4-a716-446655440001',
    styles: [{ styleName: 'Normal', styleID: 0 }],
  },
];

describe('Coeiroink', () => {
  let mockClient: { GET: any; POST: any };
  let mockCreateClient: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create fresh mock client
    mockClient = {
      GET: vi.fn(),
      POST: vi.fn(),
    };

    // Mock createClient to return our mock client
    mockCreateClient = vi.mocked(createClient);
    mockCreateClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    // Restore all mocks after each test
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with custom apiUrl', () => {
      const customUrl = 'http://custom-api.example.com:8080';
      new Coeiroink({
        apiUrl: customUrl,
        speaker: mockSpeaker,
      });

      expect(mockCreateClient).toHaveBeenCalledWith({
        baseUrl: customUrl,
      });
    });

    it('should use COEIROINK_API_URL environment variable when apiUrl not provided', () => {
      const envUrl = 'http://env-api.example.com:9000';
      process.env.COEIROINK_API_URL = envUrl;

      new Coeiroink({
        speaker: mockSpeaker,
      });

      expect(mockCreateClient).toHaveBeenCalledWith({
        baseUrl: envUrl,
      });

      delete process.env.COEIROINK_API_URL;
    });

    it('should use default URL when neither apiUrl nor env variable provided', () => {
      delete process.env.COEIROINK_API_URL;

      new Coeiroink({
        speaker: mockSpeaker,
      });

      expect(mockCreateClient).toHaveBeenCalledWith({
        baseUrl: 'http://127.0.0.1:50032',
      });
    });

    it('should store the provided speaker', async () => {
      mockClient.POST.mockResolvedValue({
        data: mockAudioData,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await coeiroink.speak('Test');

      // Verify speaker is used in API call
      expect(mockClient.POST).toHaveBeenCalledWith(
        '/v1/synthesis',
        expect.objectContaining({
          body: expect.objectContaining({
            speakerUuid: mockSpeaker.UUID,
          }),
        }),
      );
    });
  });

  describe('speak', () => {
    it('should successfully synthesize speech with default style', async () => {
      mockClient.POST.mockResolvedValue({
        data: mockAudioData,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      const result = await coeiroink.speak('Hello world');

      expect(mockClient.POST).toHaveBeenCalledWith('/v1/synthesis', {
        headers: { 'Content-Type': 'application/json' },
        body: {
          speakerUuid: mockSpeaker.UUID,
          styleId: mockSpeaker.styles[0].styleID,
          text: 'Hello world',
          speedScale: 1.0,
          volumeScale: 1.0,
          pitchScale: 0.0,
          intonationScale: 1.0,
          prePhonemeLength: 0.1,
          postPhonemeLength: 0.5,
          outputSamplingRate: 24000,
          startTrimBuffer: 0.0,
          endTrimBuffer: 0.0,
          pauseStartTrimBuffer: 0.0,
          pauseEndTrimBuffer: 0.0,
        },
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(Buffer.from(result)).toEqual(Buffer.from(mockAudioData));
    });

    it('should use specified style index', async () => {
      mockClient.POST.mockResolvedValue({
        data: mockAudioData,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await coeiroink.speak('Hello world', 1);

      expect(mockClient.POST).toHaveBeenCalledWith(
        '/v1/synthesis',
        expect.objectContaining({
          body: expect.objectContaining({
            styleId: mockSpeaker.styles[1].styleID,
          }),
        }),
      );
    });

    it('should throw error when API returns error', async () => {
      const mockError = { message: 'API Error', status: 500 };
      mockClient.POST.mockResolvedValue({
        data: undefined,
        error: mockError,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.speak('Hello')).rejects.toEqual(mockError);
    });

    it('should throw error when both data and error are undefined', async () => {
      mockClient.POST.mockResolvedValue({
        data: undefined,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.speak('Hello')).rejects.toThrow(
        'Unexpected API response: both data and error are undefined',
      );
    });

    it('should propagate network errors', async () => {
      const networkError = new Error('Network failure');
      mockClient.POST.mockRejectedValue(networkError);

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.speak('Hello')).rejects.toThrow('Network failure');
    });

    it('should log error to console when API returns error', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockError = { message: 'API Error' };

      mockClient.POST.mockResolvedValue({
        data: undefined,
        error: mockError,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.speak('Hello')).rejects.toEqual(mockError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('COEIROINK speak Error'),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getSpeakers', () => {
    it('should successfully retrieve speakers list', async () => {
      mockClient.GET.mockResolvedValue({
        data: mockSpeakers,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      const result = await coeiroink.getSpeakers();

      expect(mockClient.GET).toHaveBeenCalledWith('/v1/speakers');
      expect(result).toEqual(mockSpeakers);
      expect(result).toHaveLength(2);
    });

    it('should throw error when API returns error', async () => {
      const mockError = { message: 'Failed to fetch speakers', status: 404 };
      mockClient.GET.mockResolvedValue({
        data: undefined,
        error: mockError,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.getSpeakers()).rejects.toEqual(mockError);
    });

    it('should throw ZodError when speaker UUID is invalid', async () => {
      const invalidData = [
        {
          name: 'Invalid Speaker',
          UUID: 'not-a-uuid',
          styles: [{ styleName: 'Normal', styleID: 0 }],
        },
      ];

      mockClient.GET.mockResolvedValue({
        data: invalidData,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.getSpeakers()).rejects.toThrow();
    });

    it('should throw ZodError when required fields are missing', async () => {
      const invalidData = [
        {
          name: 'Invalid Speaker',
          // Missing UUID
          styles: [{ styleName: 'Normal', styleID: 0 }],
        },
      ];

      mockClient.GET.mockResolvedValue({
        data: invalidData,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.getSpeakers()).rejects.toThrow();
    });

    it('should throw ZodError when styles array is invalid', async () => {
      const invalidData = [
        {
          name: 'Invalid Speaker',
          UUID: '550e8400-e29b-41d4-a716-446655440000',
          styles: [
            {
              styleName: 'Normal',
              styleID: 'not-a-number', // Should be number
            },
          ],
        },
      ];

      mockClient.GET.mockResolvedValue({
        data: invalidData,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.getSpeakers()).rejects.toThrow();
    });

    it('should throw error when both data and error are undefined', async () => {
      mockClient.GET.mockResolvedValue({
        data: undefined,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.getSpeakers()).rejects.toThrow(
        'Unexpected API response: both data and error are undefined',
      );
    });

    it('should log error to console when API returns error', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockError = { message: 'API Error' };

      mockClient.GET.mockResolvedValue({
        data: undefined,
        error: mockError,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.getSpeakers()).rejects.toEqual(mockError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('COEIROINK getSpeaker Error'),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error to console when Zod validation fails', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const invalidData = [
        { name: 'Invalid', UUID: 'not-a-uuid', styles: [] },
      ];

      mockClient.GET.mockResolvedValue({
        data: invalidData,
        error: undefined,
      });

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      await expect(coeiroink.getSpeakers()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('COEIROINK getSpeakers Error'),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setSpeaker', () => {
    it('should update the speaker', () => {
      const newSpeaker: Speaker = {
        name: 'New Speaker',
        UUID: '770e8400-e29b-41d4-a716-446655440002',
        styles: [{ styleName: 'Excited', styleID: 2 }],
      };

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      // Should not throw
      coeiroink.setSpeaker(newSpeaker);
    });

    it('should use new speaker in subsequent speak calls', async () => {
      mockClient.POST.mockResolvedValue({
        data: mockAudioData,
        error: undefined,
      });

      const newSpeaker: Speaker = {
        name: 'New Speaker',
        UUID: '770e8400-e29b-41d4-a716-446655440002',
        styles: [{ styleName: 'Excited', styleID: 2 }],
      };

      const coeiroink = new Coeiroink({
        speaker: mockSpeaker,
      });

      coeiroink.setSpeaker(newSpeaker);
      await coeiroink.speak('Test');

      expect(mockClient.POST).toHaveBeenCalledWith(
        '/v1/synthesis',
        expect.objectContaining({
          body: expect.objectContaining({
            speakerUuid: newSpeaker.UUID,
            styleId: newSpeaker.styles[0].styleID,
          }),
        }),
      );
    });
  });
});

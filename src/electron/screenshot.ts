import { screen, desktopCapturer, BrowserWindow } from 'electron';
import sharp from 'sharp';

export async function captureScreen(displayId?: number): Promise<string> {
  try {
    // Get all displays
    const displays = screen.getAllDisplays();
    
    let targetDisplay = displays[0]; // Default to primary
    
    if (displayId !== undefined) {
      const found = displays.find((d) => d.id === displayId);
      if (found) {
        targetDisplay = found;
      }
    }
    
    // Get sources for all screens
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
      },
    });
    
    if (sources.length === 0) {
      throw new Error('No display sources available');
    }
    
    // Get the thumbnail from the primary screen or specified display
    const source = sources[0]; // Usually the primary display
    const thumbnail = source.thumbnail;
    
    // Convert to base64
    const base64String = thumbnail.toPNG().toString('base64');
    
    return base64String;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw error;
  }
}

export async function captureScreenArea(x: number, y: number, width: number, height: number): Promise<string> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width,
        height,
      },
    });
    
    if (sources.length === 0) {
      throw new Error('No display sources available');
    }
    
    const source = sources[0];
    const thumbnail = source.thumbnail;
    
    const base64String = thumbnail.toPNG().toString('base64');
    
    return base64String;
  } catch (error) {
    console.error('Error capturing screen area:', error);
    throw error;
  }
}

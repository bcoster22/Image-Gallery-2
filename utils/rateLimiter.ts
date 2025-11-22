// A simple queue to process API requests in batches to avoid rate-limiting.
// These values are chosen to be conservative for the Gemini free tier (15 RPM).
const BATCH_SIZE = 1; // Process one request at a time to be less "bursty".
const DELAY_BETWEEN_BATCHES = 6100; // Delay in ms. (1 req / ~6s) * 60s = ~10 RPM.

export class RateLimitedApiQueue {
  private queue: (() => Promise<any>)[] = [];
  private isProcessing = false;

  /**
   * Adds a new API request function to the queue and starts processing if not already active.
   * @param requestFn A function that returns a Promise for the API request.
   */
  add(requestFn: () => Promise<any>): void {
    this.queue.push(requestFn);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Take a batch of requests from the front of the queue
    const batch = this.queue.splice(0, BATCH_SIZE);
    
    try {
      // Process all promises in the batch concurrently
      await Promise.all(batch.map(fn => fn()));
    } catch (error) {
      // This is a fallback. Individual errors should be handled within the requestFn itself.
      console.error("An error occurred while processing a batch. The queue will continue.", error);
    }

    // If there are more items, wait and then continue processing.
    if (this.queue.length > 0) {
      setTimeout(() => {
        this.isProcessing = false;
        this.processQueue();
      }, DELAY_BETWEEN_BATCHES);
    } else {
      this.isProcessing = false;
    }
  }
}
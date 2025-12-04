import { ImageInfo, PromptStrategy, ImageAnalysisResult } from '../types';

/**
 * Executes a multi-step prompt strategy using a provided model callback.
 * 
 * @param strategy The prompt strategy to execute.
 * @param image The image to analyze.
 * @param callModel A callback function that takes a prompt and returns a Promise resolving to the model's text response.
 * @param onStatus Optional callback to update status messages in the UI.
 * @returns A Promise resolving to the aggregated ImageAnalysisResult.
 */
export const executeStrategy = async (
    strategy: PromptStrategy,
    image: ImageInfo,
    callModel: (prompt: string) => Promise<string | { text: string, stats?: any }>,
    onStatus?: (message: string) => void
): Promise<ImageAnalysisResult> => {
    const fullDescriptionParts: string[] = [];
    const allKeywords: string[] = [];
    let aggregatedStats: any = undefined;
    let lastError: any = null;
    let successCount = 0;

    // Execute each step in the strategy
    for (const step of strategy.steps) {
        if (onStatus) onStatus(step.status);
        console.log(`[executeStrategy] Running step: ${step.name} (${step.id})`);

        try {
            const result = await callModel(step.prompt);
            let responseText = '';

            if (typeof result === 'string') {
                responseText = result;
            } else {
                responseText = result.text;
                if (result.stats) {
                    // For now, just take the last available stats, or we could sum them up if we want total tokens
                    aggregatedStats = result.stats;
                }
            }

            // Heuristic: If the step is explicitly about keywords, try to parse them
            // We check if the name contains "keyword" to allow for multiple keyword steps (e.g. "Visual Keywords", "Mood Keywords")
            const isKeywordStep = step.id === 'keywords' ||
                step.name.toLowerCase().includes('keyword');

            if (isKeywordStep) {
                // simple split by comma if it looks like a list, or just add the whole text
                const keywords = responseText.split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0);
                allKeywords.push(...keywords);
            } else {
                fullDescriptionParts.push(responseText);
            }
            successCount++;
        } catch (error) {
            console.error(`Error executing step ${step.name}:`, error);
            lastError = error;
            // Continue to next step even if one fails
        }
    }

    // If all steps failed and we have an error, throw it
    if (successCount === 0 && lastError) {
        throw lastError;
    }

    // Aggregate results
    let description = fullDescriptionParts.join('\n\n');

    // Fallback: If no description was generated but we have keywords, use them as the description
    if (!description && allKeywords.length > 0) {
        description = `Keywords detected: ${allKeywords.join(', ')}`;
    }

    // Deduplicate keywords
    const uniqueKeywords = Array.from(new Set(allKeywords));

    return {
        recreationPrompt: description || "Analysis failed to generate a description.",
        keywords: uniqueKeywords,
        stats: aggregatedStats,
        // We don't have a specific rating from this generic strategy unless a step is specifically designed for it.
        // Providers can add their own post-processing for rating if needed.
    };
};

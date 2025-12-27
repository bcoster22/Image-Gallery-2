export const getFriendlyErrorMessage = (error: any): string => {
    const message = (typeof error === 'object' && error !== null && 'message' in error) ? String(error.message) : 'An unknown error occurred.';
    const lowerCaseMessage = message.toLowerCase();

    if (lowerCaseMessage.includes('api key') || lowerCaseMessage.includes('401') || lowerCaseMessage.includes('403') || lowerCaseMessage.includes('requested entity was not found')) {
        return 'API Key Invalid or Missing. Please check your settings and ensure the key is correct and has the necessary permissions.';
    }
    if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('rate limit') || lowerCaseMessage.includes('resource_exhausted') || lowerCaseMessage.includes('429')) {
        return 'Rate Limit or Quota Exceeded. The AI provider\'s limit has been reached. Please wait or check your plan details.';
    }
    if (lowerCaseMessage.includes('safety')) {
        const reason = message.split(/safety|:|due to/i).pop()?.trim().replace(/\.$/, '') || 'Unknown';
        return `Content Policy Violation. The request was blocked for safety reasons (${reason}).`;
    }
    return message; // Return original message if no specific pattern is matched
};

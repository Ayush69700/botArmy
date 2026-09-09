/**
 * Static Music and Social Enrichment Layer
 * Supplies mock profile data as memory-like entries into the retrieval pipeline.
 * Fully decoupled and can be toggled on/off live without breaking the app.
 */

import fakeProfileData from '../../fixtures/fakeProfile.json' with { type: 'json' };

let enrichmentEnabled = true;

export function isEnrichmentEnabled() {
  return enrichmentEnabled;
}

export function setEnrichmentEnabled(enabled) {
  enrichmentEnabled = Boolean(enabled);
}

export function getRawProfile() {
  return fakeProfileData;
}

/**
 * Transforms the static JSON profile into standardized memory objects.
 * @returns {Array<Object>} Memory objects formatted for retrieval
 */
export function getEnrichmentMemories() {
  if (!enrichmentEnabled) {
    return [];
  }

  const memories = [];

  // Music preferences
  if (fakeProfileData.top_artists && fakeProfileData.top_artists.length > 0) {
    memories.push({
      id: 'enrichment-artists',
      type: 'preference',
      content: `User's favorite music artists include ${fakeProfileData.top_artists.join(', ')}.`,
      tag: 'music',
      turn: 0,
      source: 'enrichment'
    });
  }

  // Listening mood
  if (fakeProfileData.recent_listening_mood) {
    memories.push({
      id: 'enrichment-mood',
      type: 'mood',
      content: `User's recent listening style: ${fakeProfileData.recent_listening_mood}.`,
      tag: 'music',
      turn: 0,
      source: 'enrichment'
    });
  }

  // Social activities
  if (Array.isArray(fakeProfileData.recent_social_activity)) {
    fakeProfileData.recent_social_activity.forEach((activity, idx) => {
      memories.push({
        id: `enrichment-social-${idx + 1}`,
        type: 'fact',
        content: `User recent social/routine activity: ${activity}.`,
        tag: 'social',
        turn: 0,
        source: 'enrichment'
      });
    });
  }

  return memories;
}

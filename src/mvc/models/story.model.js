/**
 * @typedef {Object} Story
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {string|null} imageUrl
 * @property {string|null} videoUrl
 * @property {string|null} sourceUrl
 * @property {'kindness'|'community'|'school'|'environment'|'other'} category
 * @property {boolean} isFeatured
 * @property {string} publishedBy
 * @property {string} publisherName
 * @property {string|null} publisherPhotoURL
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

export function buildStoryDoc(uid, profile, data) {
  return {
    title:             data.title.trim(),
    content:           data.content.trim(),
    imageUrl:          data.imageUrl   ?? null,
    videoUrl:          data.videoUrl   ?? null,
    sourceUrl:         data.sourceUrl  ?? null,
    category:          data.category   ?? 'kindness',
    isFeatured:        data.isFeatured ?? false,
    publishedBy:       uid,
    publisherName:     profile.displayName,
    publisherPhotoURL: profile.photoURL ?? null,
  }
}

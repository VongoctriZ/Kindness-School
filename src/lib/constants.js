export const POINTS = {
  POST:          10,
  COMMENT:        5,
  LIKE_RECEIVED:  2,
  REGISTER:      20,
}

export const ROLES = {
  STUDENT:         'student',
  TEACHER:         'teacher',
  PENDING_TEACHER: 'pending_teacher',
  ADMIN:           'admin',
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10 MB

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm']

export const FEED_PAGE_SIZE      = 20
export const FEED_LOAD_MORE_SIZE = 10
export const LEADERBOARD_SIZE    = 200

export const MATURE_TREE_THRESHOLD = 1000
export const ANCIENT_TREE_COUNT    = 3    // matureTreeCount >= 3 → Cây cổ thụ

export const GRADE_BLOCKS = [6, 7, 8, 9, 10, 11, 12]

export const STORY_CATEGORIES = [
  { value: 'kindness',     label: '💛 Lòng tốt'   },
  { value: 'community',   label: '🤝 Cộng đồng'  },
  { value: 'school',      label: '🏫 Trường học'  },
  { value: 'environment', label: '🌿 Môi trường'  },
  { value: 'other',       label: '✨ Khác'         },
]

export const STATIC_HERO_SLIDES = [
  {
    imageUrl: '/kindness/co-giao-20-10.jpg',
    title:   'Tri ân thầy cô — Lòng biết ơn không lời',
    caption: 'Những bông hoa nhỏ, tấm lòng lớn của học trò',
    storyId: null,
  },
  {
    imageUrl: '/kindness/trung-thu-vung-cao.jpg',
    title:   'Trung Thu cho em vùng cao',
    caption: 'Ánh trăng yêu thương lan tỏa đến mọi miền',
    storyId: null,
  },
  {
    imageUrl: '/kindness/hs-trong-cay.jpg',
    title:   'Học sinh trồng cây xanh',
    caption: 'Mỗi cây xanh là một tương lai xanh',
    storyId: null,
  },
  {
    imageUrl: '/kindness/bvmt.jpg',
    title:   'Cùng nhau bảo vệ môi trường',
    caption: 'Hành động nhỏ — tác động lớn cho Trái Đất',
    storyId: null,
  },
  {
    imageUrl: '/kindness/tang-qua-30-4.jpg',
    title:   'Sẻ chia yêu thương ngày 30/4',
    caption: 'Trao đi hạnh phúc là nhận lại niềm vui',
    storyId: null,
  },
]

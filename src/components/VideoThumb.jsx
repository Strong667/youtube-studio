'use client'
/* eslint-disable @next/next/no-img-element */

import { formatDuration } from '@/lib/format'

export default function VideoThumb({ video, className = '' }) {
  return (
    <div className={`thumb ${className}`}>
      {video.thumbnail ? (
        <img src={video.thumbnail} alt="" />
      ) : (
        <div className="thumb-placeholder">▶</div>
      )}
      {video.duration && video.duration !== 'PT0S' && (
        <span className="thumb-duration">{formatDuration(video.duration)}</span>
      )}
    </div>
  )
}

/* eslint-disable @next/next/no-img-element */
export function Avatar({ channel, size = 48 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 }
  return channel.avatar ? (
    <img className="avatar" src={channel.avatar} alt="" style={style} />
  ) : (
    <div className="avatar avatar-fallback" style={style}>
      {channel.title?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

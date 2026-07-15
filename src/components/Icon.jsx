import { Icon as IconifyIcon } from '@iconify/react'

export default function Icon({ name, className, style, ...props }) {
  return <IconifyIcon icon={name} className={className} style={style} {...props} />
}

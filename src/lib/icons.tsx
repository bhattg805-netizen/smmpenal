import React from 'react';
import { 
  Facebook, 
  Instagram, 
  Youtube, 
  Twitter, 
  Send, 
  Globe, 
  Music, 
  Sparkles, 
  Star, 
  Heart,
  Video,
  Users
} from 'lucide-react';

export interface PresetIcon {
  id: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}

export const PRESET_ICONS = [
  { id: 'facebook', label: 'Facebook', colorClass: 'text-blue-500' },
  { id: 'instagram', label: 'Instagram', colorClass: 'text-pink-500' },
  { id: 'telegram', label: 'Telegram', colorClass: 'text-sky-400' },
  { id: 'youtube', label: 'YouTube', colorClass: 'text-red-500' },
  { id: 'tiktok', label: 'TikTok', colorClass: 'text-teal-400' },
  { id: 'twitter', label: 'Twitter', colorClass: 'text-sky-300' },
  { id: 'linkedin', label: 'LinkedIn', colorClass: 'text-blue-400' },
  { id: 'globe', label: 'Website / General', colorClass: 'text-purple-400' },
  { id: 'sparkles', label: 'VIP / Premium', colorClass: 'text-amber-400' },
  { id: 'star', label: 'Favorites', colorClass: 'text-yellow-400' },
  { id: 'heart', label: 'Likes / Engagement', colorClass: 'text-rose-500' },
  { id: 'video', label: 'Video Services', colorClass: 'text-emerald-400' },
];

export function getCategoryIcon(
  iconValue: string | null | undefined, 
  categoryName?: string, 
  className = 'w-4 h-4'
): React.ReactNode {
  // 1. If we have a custom URL (image)
  if (iconValue && (iconValue.startsWith('http://') || iconValue.startsWith('https://'))) {
    return (
      <img 
        src={iconValue} 
        alt="" 
        className={`${className} object-contain rounded-sm`} 
        referrerPolicy="no-referrer"
      />
    );
  }

  // 2. If we have a single character or emoji
  if (iconValue && iconValue.trim().length <= 2) {
    return <span className="inline-block text-sm leading-none font-sans">{iconValue.trim()}</span>;
  }

  // 3. Normalize search key
  const key = (iconValue || categoryName || '').toLowerCase().trim();

  // 4. Map key to corresponding Lucide Icon
  if (key.includes('facebook') || key === 'fb') {
    return <Facebook className={`${className} text-blue-500`} />;
  }
  if (key.includes('instagram') || key === 'ig') {
    return <Instagram className={`${className} text-pink-500`} />;
  }
  if (key.includes('telegram') || key === 'tg') {
    return <Send className={`${className} text-sky-400`} />;
  }
  if (key.includes('youtube') || key === 'yt') {
    return <Youtube className={`${className} text-red-500`} />;
  }
  if (key.includes('tiktok') || key.includes('tik tok')) {
    return <Music className={`${className} text-teal-400`} />;
  }
  if (key.includes('twitter') || key === 'x' || key.includes('thread')) {
    return <Twitter className={`${className} text-sky-300`} />;
  }
  if (key.includes('linkedin')) {
    return <Users className={`${className} text-blue-400`} />;
  }
  if (key.includes('vip') || key.includes('premium') || key.includes('sparkles')) {
    return <Sparkles className={`${className} text-amber-400`} />;
  }
  if (key.includes('star') || key.includes('fav')) {
    return <Star className={`${className} text-yellow-400`} />;
  }
  if (key.includes('heart') || key.includes('like') || key.includes('love')) {
    return <Heart className={`${className} text-rose-500`} />;
  }
  if (key.includes('video') || key.includes('view') || key.includes('watch')) {
    return <Video className={`${className} text-emerald-400`} />;
  }

  // Fallback to globe / default
  return <Globe className={`${className} text-purple-400`} />;
}

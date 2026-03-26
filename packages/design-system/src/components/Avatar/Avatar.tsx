import { cn } from "../../utils";

export interface AvatarProps {
  src?:       string;
  name:       string;
  size?:      "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  return (
    <div
      data-testid="avatar"
      className={cn(
        "rounded-full flex items-center justify-center font-semibold flex-shrink-0 bg-indigo-100 text-indigo-700 overflow-hidden",
        sizeMap[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

export interface AvatarGroupProps {
  users:      { name: string; src?: string }[];
  max?:       number;
  size?:      "sm" | "md" | "lg";
  className?: string;
}

export function AvatarGroup({ users, max = 3, size = "md", className }: AvatarGroupProps) {
  const visible  = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div
      data-testid="avatar-group"
      className={cn("flex items-center", className)}
    >
      {visible.map((user, i) => (
        <div key={i} className="-ml-2 first:ml-0 ring-2 ring-white rounded-full">
          <Avatar name={user.name} src={user.src} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "-ml-2 ring-2 ring-white rounded-full flex items-center justify-center bg-gray-100 text-gray-600 font-semibold flex-shrink-0",
            sizeMap[size]
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
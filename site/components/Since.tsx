// small version note for features newer than the oldest published release
export default function Since({ v, children }: { v: string; children?: React.ReactNode }) {
  return <p className="!mt-3 inline-flex rounded-full bg-cream px-3 py-1 text-xs font-semibold text-brick">{children ?? `Available from veralayer ${v}`}</p>;
}

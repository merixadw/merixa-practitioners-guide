import { PathList } from "@/components/PathList";

/** Path packs load on the client — avoid serializing ~5MB JSON through RSC. */
export default function PathsPage() {
  return <PathList />;
}

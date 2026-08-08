export interface BlogRailItem {
  slug: string;
  route: string;
  title: string;
  date: string;
  current: boolean;
}

/** Every post, newest first (date desc, then slug asc), each marked as current or not. */
export function blogRailItems(
  posts: ReadonlyArray<{
    slug: string;
    route: string;
    title: string;
    date: string;
  }>,
  currentRoute: string | null,
): BlogRailItem[] {
  return [...posts]
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.slug.localeCompare(b.slug);
    })
    .map((post) => ({
      slug: post.slug,
      route: post.route,
      title: post.title,
      date: post.date,
      current: post.route === currentRoute,
    }));
}

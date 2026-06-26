import { SquaresPlusIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCategoriesList } from "../../../context/categoriesList";
import { getAllBookmarksWithCache } from "../../../helpers/bookmarkService";
import { useUserSettingsStore, userSettingsKeys } from "../../../stores/userSettingsStore";
import Group from "../components/group";

export default function GroupList() {
  let { categories, isLoading, fetchCategories, abort } = useCategoriesList();

  const [ columns ] = useUserSettingsStore(userSettingsKeys.Columns);

  // All bookmarks are loaded once here (single cached object) and grouped by
  // categoryId, instead of each Group fetching its own category.
  const [bookmarksByCategory, setBookmarksByCategory] = useState(null);
  const bookmarksAbort = useRef(null);

  useEffect(() => {
    fetchCategories();

    bookmarksAbort.current = new AbortController();
    getAllBookmarksWithCache(bookmarksAbort.current.signal)
      .then((all) => {
        const grouped = {};
        for (const b of all) {
          (grouped[b.categoryId] ??= []).push(b);
        }
        for (const k in grouped) {
          grouped[k].sort(
            (a, b) => (a.position ?? Infinity) - (b.position ?? Infinity)
          );
        }
        setBookmarksByCategory(grouped);
      })
      .catch(() => setBookmarksByCategory({})); // render empty columns on failure

    return () => {
      abort();
      bookmarksAbort.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <div></div>;
  if (categories.length === 0) {
    return (
      <div className="w-fit self-center flex items-center gap-3 bg-white px-6 py-2 rounded shadow-xl dark:text-white dark:bg-gray-700 dark:shadow-cyan-500/10">
        <div className="h-10 w-10 text-fuchsia-600">
          <SquaresPlusIcon />
        </div>
        <div>
          <div className="text-xl">No groups.</div>
          <div>
            Add them in{" "}
            <Link to={"/settings"} className="text-cyan-600 hover:underline">
              settings
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-center w-full">
      <div
        className={`grid md:grid-cols-${columns} grid-cols-1 gap-4 justify-items-center md:w-2/3 w-11/12`}
      >
        {categories.map((category) => (
          <Group
            key={category.id}
            category={category}
            bookmarks={bookmarksByCategory?.[category.id] ?? []}
            isLoading={bookmarksByCategory === null}
          />
        ))}
      </div>
    </div>
  );
}

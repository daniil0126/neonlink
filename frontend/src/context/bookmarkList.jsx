import React, { createContext, useContext, useRef, useState } from "react";
import { deleteJSON, getJSON, putJSON } from "../helpers/fetch";
import {
  useUserSettingsStore,
  userSettingsKeys,
} from "../stores/userSettingsStore";
import { getBookmarksWithCache, resetBookmarksCache } from "../helpers/bookmarkService";

const BookMarkList = createContext();

export function useBookMarkList() {
  return useContext(BookMarkList);
}

export function BookMarkListProvider({ children }) {
  const [maxItemsInList] = useUserSettingsStore(
    userSettingsKeys.MaxItemsInLinks
  );

  const [bookmarkList, setBookmarkList] = useState([]);
  const [isBookmarksLoading, setIsBookmarksLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(10);
  const [errorBookmarks, setErrorBookmarks] = useState();
  const abortController = useRef(null);

  function abort() {
    abortController.current.abort();
  }

  async function fetchBookmarks({
    offset = 0,
    limit = maxItemsInList,
    query,
    tag,
    category,
  }) {
    setIsBookmarksLoading(true);
    setErrorBookmarks(undefined);

    abortController.current?.abort();
    abortController.current = new AbortController();

    try {
      const data = await getBookmarksWithCache({ offset, limit, query, tag, category }, abortController.current.signal)

      setBookmarkList(data.bookmarks)
      setCurrentPage(data.currentPage)
      setLastPage(data.lastPage)
    } catch (error) {
      if(error === "AbortError") return
      setErrorBookmarks(error.message)
    } finally {
      setIsBookmarksLoading(false)
    }

  }

  async function deleteBookmark(id) {
    abortController.current = new AbortController();
    let res = await deleteJSON(
      `/api/bookmarks/${id}`,
      abortController.current.signal
    );
    if (res.ok) {
      await resetBookmarksCache()
      setBookmarkList(bookmarkList.filter((item) => item.id !== id));
    } else {
      console.error(await res.json());
    }
  }

  async function changePositions(idPositionPairArray) {
    abortController.current = new AbortController();
    let res = await putJSON(
      `api/bookmarks/changePositions`,
      idPositionPairArray,
      abortController.current.signal
    );

    if(res.ok) await resetBookmarksCache()
  }

  return (
    <BookMarkList.Provider
      value={{
        bookmarkList,
        errorBookmarks,
        currentPage,
        lastPage,
        isBookmarksLoading,
        fetchBookmarks,
        deleteBookmark,
        changePositions,
        abort,
      }}
    >
      {children}
    </BookMarkList.Provider>
  );
}

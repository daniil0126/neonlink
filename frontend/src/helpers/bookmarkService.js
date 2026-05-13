import { getJSON } from "./fetch";

/**
 * @param {Object} params
 * @param {AbortSignal} signal
 * @returns {Promise<{bookmarks: Array, currentPage: number, lastPage: number, fromCache: boolean}>}
 */

export async function getBookmarksWithCache(params, signal) {
    const { offset, limit, query, tag, category } = params;

    let bookmarks = null;
    let hash = null;
    let cachedBookmarks = null;
    let cachedHash = null;

    try {
        cachedBookmarks = localStorage.getItem("neonlink_bookmarks");
        cachedHash = localStorage.getItem("neonlink_bookmarks_hash");
        if (cachedBookmarks !== null && typeof cachedBookmarks !== 'undefined') {
            bookmarks = JSON.parse(cachedBookmarks);
            hash = cachedHash
        }
    } catch (error) {
        await resetBookmarksCache()
    }

    let meta;
    try {
        const res = await getJSON("/api/bookmarks/meta", signal);
        if (!res.ok) throw new Error("Meta fetch failed");
        meta = await res.json();
    } catch (error) {
        if (bookmarks) {
            return { bookmarks, currentPage: 1, lastPage: 1, fromCache: true };
        }
        throw error;
    }

    if (hash !== meta.hash || !hash || !bookmarks) {
        let searchParams = new URLSearchParams()
        searchParams.append("offset", offset);
        searchParams.append("limit", limit);
        if (query) searchParams.append("q", query);
        if (tag) searchParams.append("tag", tag);
        if (category) searchParams.append("category", category);

        try {
            let res = await getJSON(`/api/bookmarks/?${searchParams.toString()}`, signal)

            if (res.ok) {
                let json = await res.json()
                try {
                    localStorage.setItem("neonlink_bookmarks", JSON.stringify(json.bookmarks))
                    localStorage.setItem("neonlink_bookmarks_hash", meta.hash)
                } catch (error) {
                    if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") {
                        await resetBookmarksCache()
                    }
                }

                return {
                    bookmarks: json.bookmarks,
                    currentPage: json.currentPage,
                    lastPage: json.lastPage,
                    fromCache: false
                }
            } else {
                const err = await res.json()
                throw new Error(err.message || "Failed to fetch bookmarks");
            }
        } catch (error) {
            if (bookmarks) {
                return { bookmarks, currentPage: 1, lastPage: 1, fromCache: true };
            }
            throw error;
        }
    }

    return { bookmarks: bookmarks || [], currentPage: 1, lastPage: 1, fromCache: true };
}

export async function resetBookmarksCache() {
    try {
        localStorage.removeItem("neonlink_bookmarks")
        localStorage.removeItem("neonlink_bookmarks_hash")
    } catch (error) {
        throw new Error(error.message || "Failed to remove localstorge items")
    }
}
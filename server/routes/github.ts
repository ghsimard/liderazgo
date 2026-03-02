import { Router, Request, Response } from "express";

const router = Router();

/** GET /api/github/commits?owner=...&repo=...&per_page=30&page=1 */
router.get("/commits", async (req: Request, res: Response) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      res.status(500).json({ error: "GITHUB_TOKEN not configured" });
      return;
    }

    const owner = (req.query.owner as string) || "your-org";
    const repo = (req.query.repo as string) || "your-repo";
    const perPage = (req.query.per_page as string) || "30";
    const page = (req.query.page as string) || "1";

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`;

    const ghRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Lovable-Changelog",
      },
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      res.status(ghRes.status).json({ error: `GitHub API error: ${ghRes.status}`, details: errText });
      return;
    }

    const commits = await ghRes.json();

    const simplified = commits.map((c: any) => ({
      sha: c.sha,
      message: c.commit?.message || "",
      date: c.commit?.author?.date || c.commit?.committer?.date || "",
      author: c.commit?.author?.name || c.author?.login || "Unknown",
      url: c.html_url || "",
    }));

    res.json(simplified);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router } from "express";
import { prisma } from "../lib/prisma";

// Serves documents stored in the database. Unknown keys fall through to the
// express.static handler mounted after this router, which still serves files
// uploaded to local disk before database storage existed.
const router = Router();

// Types a browser would execute as a page/script if shown inline from our origin.
const FORCE_DOWNLOAD = new Set(["text/html", "application/xhtml+xml", "image/svg+xml"]);

router.get("/:key", async (req, res, next) => {
  try {
    const file = await prisma.storedFile.findUnique({ where: { id: req.params.key } });
    if (!file) return next();

    const type = (file.contentType ?? "application/octet-stream").toLowerCase();
    const disposition = FORCE_DOWNLOAD.has(type.split(";")[0]) ? "attachment" : "inline";
    res.setHeader("Content-Type", type);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    res.send(Buffer.from(file.data));
  } catch (err) {
    next(err);
  }
});

export default router;

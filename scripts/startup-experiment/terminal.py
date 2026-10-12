"""Respond to the terminal queries used by Pi's startup UI."""

import re

QUERY = re.compile(
    rb"\x1b\](?:10;\?|11;\?|4;\d+;\?)(?:\x07|\x1b\\)"
    rb"|\x1b\[(?:c|0c|6n|\?996n|\?u|16t|14t|18t)"
)
PALETTE = [
    "000000", "cd0000", "00cd00", "cdcd00", "0000ee", "cd00cd", "00cdcd", "e5e5e5",
    "7f7f7f", "ff0000", "00ff00", "ffff00", "5c5cff", "ff00ff", "00ffff", "ffffff",
]


class TerminalReplies:
    def __init__(self):
        self.pending = b""

    def feed(self, data):
        self.pending += data
        replies = []
        end = 0
        for match in QUERY.finditer(self.pending):
            query = match.group()
            if query.startswith(b"\x1b]"):
                parts = query[2:].rstrip(b"\x07").removesuffix(b"\x1b\\").split(b";")
                if parts[0] == b"4":
                    index = int(parts[1])
                    color = PALETTE[index] if index < len(PALETTE) else "000000"
                    target = b"4;" + parts[1]
                else:
                    color = "e5e5e5" if parts[0] == b"10" else "000000"
                    target = parts[0]
                rgb = "/".join(color[i:i + 2] * 2 for i in (0, 2, 4)).encode()
                reply = b"\x1b]" + target + b";rgb:" + rgb + b"\x07"
            else:
                reply = {
                    b"\x1b[c": b"\x1b[?1;2c", b"\x1b[0c": b"\x1b[?1;2c",
                    b"\x1b[6n": b"\x1b[1;1R", b"\x1b[?996n": b"\x1b[?997;1n",
                    b"\x1b[?u": b"\x1b[?0u", b"\x1b[16t": b"\x1b[6;16;8t",
                    b"\x1b[14t": b"\x1b[4;640;960t", b"\x1b[18t": b"\x1b[8;40;120t",
                }[query]
            replies.append((query, reply))
            end = match.end()
        self.pending = self.pending[end:][-128:]
        return replies

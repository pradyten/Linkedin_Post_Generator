from datetime import datetime

from pydantic import BaseModel


class TrendItem(BaseModel):
    title: str
    summary: str
    url: str | None = None
    source: str  # "tavily" | "hackernews" | "rss"
    timestamp: datetime | None = None

"""Collect dated promotions from public merchant pages and publish only metadata."""
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

JAKARTA = ZoneInfo("Asia/Jakarta")
INDOMARET = "https://www.indomaret.co.id/promosi/"
ALFAGIFT = "https://blog.alfagift.id/feed/"
MONTHS = {name: index for index, name in enumerate(
    "januari februari maret april mei juni juli agustus september oktober november desember".split(), 1)}
MONTH = "|".join(MONTHS)
PERIOD = re.compile(
    rf"(?<!\d)(\d{{1,2}})(?:\s+({MONTH}))?(?:\s+(\d{{4}}))?\s*[-–—]\s*(\d{{1,2}})\s+({MONTH})(?:\s+(\d{{4}}))?\b",
    re.IGNORECASE,
)


def dated_period(text, year=None):
    match = PERIOD.search(text)
    if not match:
        return None
    first_day, first_month, first_year, last_day, last_month, last_year = match.groups()
    if not (last_year or year):
        return None
    end_year = int(last_year or year)
    first_month = MONTHS[(first_month or last_month).lower()]
    last_month = MONTHS[last_month.lower()]
    start_year = int(first_year) if first_year else end_year - (first_month > last_month)
    try:
        start, end = date(start_year, first_month, int(first_day)), date(end_year, last_month, int(last_day))
    except ValueError:
        return None
    return (start, end) if start <= end and (end - start).days <= 90 else None


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": "LevelUp-PromoNews/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        contents = response.read(4_000_001)
        if len(contents) > 4_000_000:
            raise ValueError("Source response is too large")
        return contents


class IndomaretPage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tag = None
        self.text = []
        self.heading = ""
        self.periods = []

    def handle_starttag(self, tag, attrs):
        if tag in ("h2", "p"):
            self.tag, self.text = tag, []

    def handle_data(self, data):
        if self.tag:
            self.text.append(data)

    def handle_endtag(self, tag):
        if self.tag != tag:
            return
        value = " ".join("".join(self.text).split())
        self.tag = None
        if tag == "h2":
            self.heading = value
        elif self.heading and re.match(r"^Periode\s*:", value, re.I):
            if period := dated_period(value):
                self.periods.append((self.heading, *period))


def collect_indomaret(today):
    parser = IndomaretPage()
    parser.feed(download(INDOMARET).decode("utf-8"))
    if not parser.periods:
        raise ValueError("No dated promotions found on the source page")
    return [
        {"title": title, "source": "Indomaret", "url": INDOMARET, "kind": "promo",
         "start": start.isoformat(), "end": end.isoformat()}
        for title, start, end in parser.periods if start <= today <= end
    ]


def collect_alfagift(today):
    feed = ET.fromstring(download(ALFAGIFT))
    posts = feed.findall("./channel/item")
    if not posts:
        raise ValueError("Alfagift feed has no posts")
    result = []
    for post in posts:
        title = " ".join(unescape(post.findtext("title", "")).split())
        url = post.findtext("link", "").strip()
        parsed_url = urlparse(url)
        if not re.search(r"\b(promo|diskon|harga super|cashback)\b", title, re.I) or parsed_url.scheme != "https" or parsed_url.hostname != "blog.alfagift.id":
            continue
        try:
            published = parsedate_to_datetime(post.findtext("pubDate", "")).astimezone(JAKARTA).date()
        except ValueError:
            continue
        if not today - timedelta(days=14) <= published <= today:
            continue
        item = {"title": title, "source": "Alfagift", "url": url, "kind": "news", "published": published.isoformat()}
        if period := dated_period(title, published.year):
            start, end = period
            if end < today:
                continue
            item.update(start=start.isoformat(), end=end.isoformat())
            if start <= today:
                item["kind"] = "promo"
        result.append(item)
    return result[:6]


def main(output):
    today = datetime.now(JAKARTA).date()
    items, checks = [], {}
    for source, collector in (("Indomaret", collect_indomaret), ("Alfagift", collect_alfagift)):
        try:
            items.extend(collector(today))
            checks[source] = True
        except (OSError, ValueError, ET.ParseError) as error:
            print(f"{source}: {error}", file=sys.stderr)
            checks[source] = False
    if not any(checks.values()):
        raise SystemExit("No source was refreshed")
    output.write_text(json.dumps({"date": today.isoformat(), "checks": checks, "items": items}, ensure_ascii=False, indent=2) + "\n")
    print(f"{today}: {len(items)} news items from public sources")


if __name__ == "__main__":
    main(Path(sys.argv[1]))

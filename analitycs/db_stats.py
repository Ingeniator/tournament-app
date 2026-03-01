#!/usr/bin/env python3
import json
import sys
from collections import Counter, defaultdict

# python3 scripts/db_stats.py tmp/database.json > tmp/{date}


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "tournament-app-a1059-default-rtdb-export-3.json"

    with open(path) as f:
        data = json.load(f)

    tournaments = data.get("tournaments", {})
    users = data.get("users", {})

    # --- Unique players ---
    all_player_names = set()
    all_player_ids = set()

    for t in tournaments.values():
        players = t.get("players", {})
        if isinstance(players, dict):
            for pid, p in players.items():
                all_player_ids.add(pid)
                name = p.get("name", "") if isinstance(p, dict) else ""
                if name:
                    all_player_names.add(name)

    # --- Format counts ---
    format_counts = Counter()
    format_participants = defaultdict(list)

    for t in tournaments.values():
        fmt = t.get("format", "unknown")
        format_counts[fmt] += 1

        players = t.get("players", {})
        count = len(players) if isinstance(players, dict) else 0
        format_participants[fmt].append(count)

    started = sum(1 for t in tournaments.values() if t.get("startedBy") or t.get("runnerData"))
    completed = sum(1 for t in tournaments.values() if t.get("completedAt"))

    print("=" * 50)
    print("         DATABASE STATISTICS")
    print("=" * 50)
    print()
    print(f"Registered users:                 {len(users)}")
    print(f"Unique player IDs in tournaments: {len(all_player_ids)}")
    print(f"Unique player names:              {len(all_player_names)}")
    print()
    print(f"Total tournaments:                {len(tournaments)}")
    print(f"  With players registered:        {sum(1 for t in tournaments.values() if t.get('players'))}")
    print(f"  Without players:                {sum(1 for t in tournaments.values() if not t.get('players'))}")
    print(f"  Started (has startedBy):        {started}")
    print(f"  Completed (has completedAt):    {completed}")
    print()

    print("=" * 50)
    print("         TOURNAMENTS BY FORMAT")
    print("=" * 50)
    for fmt in sorted(format_counts.keys()):
        count = format_counts[fmt]
        parts = format_participants[fmt]
        non_zero = [p for p in parts if p > 0]
        total_parts = sum(parts)
        avg = (sum(non_zero) / len(non_zero)) if non_zero else 0
        min_p = min(non_zero) if non_zero else 0
        max_p = max(non_zero) if non_zero else 0
        print()
        print(f"  {fmt.upper()}")
        print(f"    Tournaments:     {count}")
        print(f"    With players:    {len(non_zero)}")
        print(f"    Total players:   {total_parts}")
        if non_zero:
            print(f"    Min / Avg / Max: {min_p} / {avg:.1f} / {max_p}")

    # Participant distribution
    print()
    print("=" * 50)
    print("    PARTICIPANT COUNT DISTRIBUTION")
    print("=" * 50)
    all_parts = []
    for t in tournaments.values():
        players = t.get("players", {})
        count = len(players) if isinstance(players, dict) else 0
        if count > 0:
            all_parts.append(count)

    ranges = [(1, 4), (5, 8), (9, 12), (13, 16), (17, 20), (21, 100)]
    range_labels = ["1-4", "5-8", "9-12", "13-16", "17-20", "21+"]
    for (lo, hi), label in zip(ranges, range_labels):
        c = sum(1 for p in all_parts if lo <= p <= hi)
        bar = "#" * c
        print(f"  {label:>5} players: {c:>2} {bar}")

    print()
    print(f"  Total registrations: {sum(all_parts)}")
    if all_parts:
        print(f"  Average per tournament (with players): {sum(all_parts)/len(all_parts):.1f}")

    # Top tournaments by player count
    print()
    print("=" * 50)
    print("     TOP 10 TOURNAMENTS BY PLAYERS")
    print("=" * 50)
    tournament_sizes = []
    for t in tournaments.values():
        players = t.get("players", {})
        count = len(players) if isinstance(players, dict) else 0
        if count > 0:
            tournament_sizes.append((count, t.get("name", "?"), t.get("format", "?")))

    tournament_sizes.sort(reverse=True)
    for i, (count, name, fmt) in enumerate(tournament_sizes[:10], 1):
        print(f"  {i:>2}. {count:>2} players — {name} ({fmt})")


if __name__ == "__main__":
    main()

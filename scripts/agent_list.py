"""Lista clients do auxiliar_agent (SQLite). Saída JSON em stdout."""
import json
import sqlite3
import sys
from datetime import datetime, timedelta

def parse_ts(value):
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%f"):
        try:
            return datetime.strptime(str(value).strip(), fmt)
        except ValueError:
            continue
    return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"erro": "Uso: agent_list.py <db_path> [max_idade_segundos]"}))
        sys.exit(1)

    db_path = sys.argv[1]
    max_age = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    try:
        conn = sqlite3.connect(db_path, timeout=15)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT hostname, ip, last_seen, status, version
            FROM clients
            ORDER BY hostname COLLATE NOCASE
            """
        ).fetchall()
        conn.close()
    except Exception as e:
        print(json.dumps({"erro": str(e), "agentes": []}))
        sys.exit(0)

    limite = datetime.now() - timedelta(seconds=max_age)
    agentes = []

    for row in rows:
        hostname = (row["hostname"] or "").strip().upper()
        if not hostname:
            continue
        last_seen = parse_ts(row["last_seen"])
        online = False
        if (row["status"] or "").upper() == "ONLINE":
            if last_seen is None or last_seen >= limite:
                online = True

        agentes.append(
            {
                "hostname": hostname,
                "ip": row["ip"] or "",
                "lastSeen": row["last_seen"],
                "status": row["status"] or "",
                "version": row["version"] or "",
                "agentOnline": online,
            }
        )

    print(json.dumps({"agentes": agentes}, ensure_ascii=False))

if __name__ == "__main__":
    main()

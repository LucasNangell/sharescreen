"""Insere comando na fila do auxiliar_agent (SQLite). Uso: python agent_enqueue.py <db> <HOSTNAME> <arquivo_conteudo>"""
import sqlite3
import sys


def main():
    if len(sys.argv) < 4:
        print("Uso: agent_enqueue.py <db_path> <HOSTNAME> <content_file>", file=sys.stderr)
        sys.exit(1)
    db_path, hostname, content_file = sys.argv[1], sys.argv[2].upper(), sys.argv[3]
    with open(content_file, encoding="utf-8") as f:
        content = f.read()
    conn = sqlite3.connect(db_path, timeout=30)
    try:
        conn.execute(
            """
            INSERT INTO commands (target_hostname, content, status, created_at)
            VALUES (?, ?, 'PENDENTE', datetime('now', '-3 hours'))
            """,
            (hostname, content),
        )
        conn.commit()
        print("OK")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

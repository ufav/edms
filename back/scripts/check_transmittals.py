import psycopg2

DSN = 'postgresql://postgres:123@localhost:5432/edms'

def main() -> None:
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    cur.execute(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='transmittals' ORDER BY ordinal_position"
    )
    cols = cur.fetchall()
    cur.execute("SELECT count(*) FROM transmittals")
    count = cur.fetchone()[0]
    print("rows:", count)
    for name, dtype in cols:
        print(f"{name}\t{dtype}")
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()



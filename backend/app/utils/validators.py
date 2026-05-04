def normalize_medicine_query(q: str) -> str:
    if not q:
        return ""
    return " ".join(q.strip().lower().split())


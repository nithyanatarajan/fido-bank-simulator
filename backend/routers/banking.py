from fastapi import APIRouter

router = APIRouter(tags=["banking"])


@router.get("/health")
def health():
    return {"status": "ok"}

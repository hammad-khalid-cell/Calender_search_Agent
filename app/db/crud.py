from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session as DBSession

from app.db.models import User, UserSession


def get_user_by_google_sub(db: DBSession, google_sub: str) -> User | None:
    return db.query(User).filter(User.google_sub == google_sub).first()


def create_or_update_user(
    db: DBSession,
    google_sub: str,
    email: str,
    name: str,
    access_token: str,
    refresh_token: str | None,
    token_expiry: datetime,
) -> User:
    user = get_user_by_google_sub(db, google_sub)

    if user:
        user.email = email
        user.name = name
        user.access_token = access_token
        if refresh_token:
            user.refresh_token = refresh_token
        user.token_expiry = token_expiry
    else:
        user = User(
            google_sub=google_sub,
            email=email,
            name=name,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=token_expiry,
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return user


def create_session(db: DBSession, user_id: str, ttl_hours: int = 24 * 7) -> UserSession:
    session = UserSession(
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=ttl_hours),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_user_by_session_id(db: DBSession, session_id: str) -> User | None:
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not session:
        return None
    if session.expires_at < datetime.now(timezone.utc):
        return None
    return session.user
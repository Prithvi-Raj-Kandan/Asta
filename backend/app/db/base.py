from sqlalchemy.ext.declarative import DeferredReflection
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def prepare_reflected_models(engine):
    DeferredReflection.prepare(engine)

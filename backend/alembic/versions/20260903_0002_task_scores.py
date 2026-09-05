"""task scores

Revision ID: 20260903_0002
"""
from alembic import op
import sqlalchemy as sa
revision = "20260903_0002"
down_revision = "20260806_0001"
branch_labels = None
depends_on = None
def upgrade():
    op.add_column("tasks", sa.Column("max_score", sa.Integer(), nullable=False, server_default="100"))
    op.add_column("task_submissions", sa.Column("score", sa.Integer(), nullable=True))
def downgrade():
    op.drop_column("task_submissions", "score")
    op.drop_column("tasks", "max_score")

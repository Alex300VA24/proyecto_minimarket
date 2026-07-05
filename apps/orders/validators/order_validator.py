from ..models import Order


def validate_order_cancellable(order: Order) -> None:
    """
    Validate that an order can be cancelled.

    An order can be cancelled if it is:
    - unpaid and pending (can be deleted entirely), or
    - in 'pending' or 'confirmed' status (can be set to cancelled).

    Raises:
        ValueError: If the order cannot be cancelled.
    """
    if order.status not in ("pending", "confirmed"):
        raise ValueError("No se puede cancelar un pedido en preparación o entregado.")


def validate_staff_role(user) -> None:
    """
    Validate that the user has staff/admin/employee role.

    Raises:
        ValueError: If the user lacks permissions.
    """
    if not user.profile.role in ("admin", "employee"):
        raise ValueError("Solo el personal autorizado puede realizar esta acción.")

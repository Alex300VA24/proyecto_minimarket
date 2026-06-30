def reduce_stock_fifo(product, quantity):
    if not product or quantity <= 0:
        return
    batches = product.batches.filter(quantity__gt=0).order_by('created_at')
    remaining = quantity
    for batch in batches:
        if remaining <= 0:
            break
        to_deduct = min(batch.quantity, remaining)
        batch.quantity -= to_deduct
        batch.save()
        remaining -= to_deduct
    if remaining > 0:
        product.stock = max(0, product.stock - remaining)
    else:
        product.stock = sum(b.quantity for b in product.batches.all())
    product.save()

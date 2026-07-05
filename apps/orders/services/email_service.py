from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def _send_html_email(subject, template_name, context, recipient_list):
    html_content = render_to_string(template_name, context)
    text_content = strip_tags(html_content)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipient_list,
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()


def send_welcome_email(user):
    context = {
        "user": user,
        "company_name": settings.COMPANY_NAME,
        "company_email": settings.COMPANY_EMAIL,
    }
    _send_html_email(
        subject=f"¡Bienvenido a {settings.COMPANY_NAME}!",
        template_name="emails/welcome_email.html",
        context=context,
        recipient_list=[user.email],
    )


def send_order_ready_email(order):
    context = {
        "order": order,
        "user": order.user,
        "company_name": settings.COMPANY_NAME,
        "company_email": settings.COMPANY_EMAIL,
    }
    _send_html_email(
        subject=f"Tu pedido #{order.pk} está listo - {settings.COMPANY_NAME}",
        template_name="emails/order_ready.html",
        context=context,
        recipient_list=[order.user.email],
    )


def send_receipt_email(order):
    context = {
        "order": order,
        "user": order.user,
        "company_name": settings.COMPANY_NAME,
        "company_email": settings.COMPANY_EMAIL,
    }
    _send_html_email(
        subject=f"Boleta #{order.boleta_code} - {settings.COMPANY_NAME}",
        template_name="emails/receipt_email.html",
        context=context,
        recipient_list=[order.user.email],
    )

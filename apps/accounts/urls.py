from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('ingresar/', views.login_view, name='login'),
    path('registrarse/', views.register_view, name='register'),
    path('salir/', views.logout_view, name='logout'),
    path('perfil/', views.profile_view, name='profile'),
    path('perfil/api/datos/', views.profile_api_data, name='profile_api_data'),
    path('perfil/cambiar-contrasena/', views.change_password, name='change_password'),
    path('reset-password/', auth_views.PasswordResetView.as_view(template_name='registration/password_reset_form.html'), name='password_reset'),
    path('reset-password/hecho/', auth_views.PasswordResetDoneView.as_view(template_name='registration/password_reset_done.html'), name='password_reset_done'),
    path('reset-password/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(template_name='registration/password_reset_confirm.html'), name='password_reset_confirm'),
    path('reset-password/complete/', auth_views.PasswordResetCompleteView.as_view(template_name='registration/password_reset_complete.html'), name='password_reset_complete'),
]

from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import PasswordChangeForm
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib import messages

from apps.orders.services.email_service import send_welcome_email

from .forms import RegisterForm, LoginForm, UserProfileForm


def login_view(request):
    if request.user.is_authenticated:
        if hasattr(request.user, 'profile') and request.user.profile.role and request.user.profile.role.name in ('admin', 'employee'):
            return redirect('dashboard')
        return redirect('home')
    if request.method == 'POST':
        form = LoginForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            # Guardar session_key antes de que Django la rote al hacer login
            request._pre_login_session_key = request.session.session_key
            login(request, user)
            # La fusión del carrito la maneja el signal user_logged_in
            if hasattr(user, 'profile') and user.profile.role and user.profile.role.name in ('admin', 'employee'):
                return redirect('dashboard')
            next_url = request.POST.get('next') or request.GET.get('next', '')
            if next_url and next_url.startswith('/'):
                return redirect(next_url)
            return redirect('home')
    else:
        form = LoginForm()
    next_val = request.POST.get('next') or request.GET.get('next', '')
    return render(request, 'accounts/login.html', {'form': form, 'next': next_val})


def register_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            try:
                send_welcome_email(user)
            except Exception:
                pass
            request._pre_login_session_key = request.session.session_key
            login(request, user)
            next_url = request.POST.get('next') or request.GET.get('next', '')
            if next_url and next_url.startswith('/'):
                return redirect(next_url)
            return redirect('home')
    else:
        form = RegisterForm()
    next_val = request.POST.get('next') or request.GET.get('next', '')
    return render(request, 'accounts/register.html', {'form': form, 'next': next_val})


def logout_view(request):
    logout(request)
    messages.info(request, 'Sesión cerrada.')
    return redirect('home')


@login_required
def profile_view(request):
    profile = request.user.profile
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            return redirect('profile')
    else:
        form = UserProfileForm(instance=profile)
    return render(request, 'accounts/profile.html', {'form': form, 'profile': profile})


@login_required
def profile_api_data(request):
    user = request.user
    profile = user.profile
    return JsonResponse({
        'success': True,
        'user': {
            'name': user.get_full_name(),
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username,
            'email': user.email,
            'phone': profile.phone or '',
            'role': profile.role.display_name if profile.role else '',
        }
    })


@login_required
def change_password(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Metodo no permitido'}, status=405)

    form = PasswordChangeForm(user=request.user, data=request.POST)
    if form.is_valid():
        user = form.save()
        update_session_auth_hash(request, user)
        return JsonResponse({'success': True})
    else:
        errors = {}
        for field, error_list in form.errors.items():
            errors[field] = error_list
        return JsonResponse({'success': False, 'errors': errors}, status=400)

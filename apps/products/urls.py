from django.urls import path
from . import views

urlpatterns = [
    path('', views.catalog_view, name='catalog'),
    path('api/datos/', views.catalog_api_data, name='catalog_api_data'),
    path('<slug:slug>/', views.product_detail_view, name='product_detail'),
]

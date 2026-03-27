from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class AngularPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'size'
    
    def get_page_number(self, request, paginator):
        page_number = request.query_params.get(self.page_query_param, 1)
        try:
            if int(page_number) == 0:
                return 1
            return super().get_page_number(request, paginator)
        except (ValueError, TypeError):
            return super().get_page_number(request, paginator)

    def get_paginated_response(self, data):
        return Response({
            'content': data,
            'totalElements': self.page.paginator.count,
            'size': self.get_page_size(self.request),
            'number': self.page.number - 1 # Angular is usually 0-indexed for display but 1-indexed for DRF
        })

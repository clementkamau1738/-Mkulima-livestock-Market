from rest_framework import serializers

from accounts.validators import normalize_kenyan_phone


class KenyanPhoneField(serializers.CharField):
    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", 20)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        return normalize_kenyan_phone(super().to_internal_value(data))


class HistorySerializer(serializers.Serializer):
    """Status history as customers see it: the reason is written for them;
    the reviewer's identity is not shown."""

    from_status = serializers.CharField()
    to_status = serializers.CharField()
    reason = serializers.CharField()
    created_at = serializers.DateTimeField()


class PersonRefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField(source="get_full_name")


class AdminHistorySerializer(HistorySerializer):
    changed_by = PersonRefSerializer(allow_null=True)


class AllowedTransitionsField(serializers.SerializerMethodField):
    """Statuses the record can move to next, from the server-side workflow."""

    def __init__(self, workflow, **kwargs):
        self.workflow = workflow
        super().__init__(**kwargs)

    def to_representation(self, obj):
        return self.workflow.allowed(obj.status)

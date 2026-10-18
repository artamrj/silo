<template>
    <div class="flex flex-col items-center justify-center">
        <div class="m-8 flex flex-col items-center">
            <object class="my-4" width="200" height="200" data="/icon.svg" />
            <div class="text-xl font-bold">Silo</div>
            <div>{{ $t("Version") }}: {{ $root.info.version }}</div>
            <div class="text-sm text-ink-muted">{{ $t("Frontend Version") }}: {{ $root.frontendVersion }}</div>

            <div v-if="!$root.isFrontendBackendVersionMatched" class="mt-4 rounded-lg border border-warning bg-warning/10 px-4 py-2 text-sm text-warning" role="alert">
                ⚠️ {{ $t("Frontend Version do not match backend version!") }}
            </div>
        </div>
    </div>
</template>

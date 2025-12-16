import typer
from typing import Optional
from rich import print as rprint
import time
import threading
import psutil
import os

from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

from .repl import REPLSession


DEFAULT_MANIFEST_URL = "https://m87-md-prod-assets.s3.us-west-2.amazonaws.com/station/mds2/production_manifest.json"


app = typer.Typer(
    name="moondream-station",
    help="🌙 Model hosting and management CLI",
    rich_markup_mode="rich",
    add_completion=False,
)

def setup_opentelemetry():
    """Initializes OpenTelemetry to send metrics to the local Next.js app."""
    try:
        resource = Resource.create(attributes={
            "service.name": "moondream-station",
            "service.instance.id": "local-station-1"
        })

        # Point to the Next.js API route we will create
        exporter = OTLPMetricExporter(endpoint="http://localhost:3000/api/otel/v1/metrics")
        
        reader = PeriodicExportingMetricReader(exporter, export_interval_millis=5000)
        provider = MeterProvider(resource=resource, metric_readers=[reader])
        metrics.set_meter_provider(provider)
        
        meter = metrics.get_meter("moondream.station")
        
        cpu_gauge = meter.create_observable_gauge(
            "system.cpu.utilization",
            callbacks=[lambda options: [metrics.Observation(psutil.cpu_percent())]],
            description="System CPU utilization percentage"
        )
        
        memory_gauge = meter.create_observable_gauge(
            "system.memory.usage",
            callbacks=[lambda options: [metrics.Observation(psutil.virtual_memory().percent)]],
            description="System Memory usage percentage"
        )

        # Keep the process alive for metrics if needed, but here we attach to the main process
        rprint("[green]OpenTelemetry monitoring initialized.[/green]")
    except Exception as e:
        rprint(f"[yellow]Failed to initialize OpenTelemetry: {e}[/yellow]")

@app.command()
def interactive(
    manifest: Optional[str] = typer.Option(
        DEFAULT_MANIFEST_URL, "--manifest", "-m", help="Manifest URL or local path"
    )
):
    """Start interactive REPL mode (default)"""
    setup_opentelemetry()
    session = REPLSession(manifest_source=manifest)
    session.start()


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    version: bool = typer.Option(False, "--version", "-v", help="Show version"),
    manifest: Optional[str] = typer.Option(
        DEFAULT_MANIFEST_URL, "--manifest", "-m", help="Manifest URL or local path"
    ),
):
    """🌙 Model hosting and management CLI"""
    if version:
        from . import __version__

        rprint(f"moondream-station version {__version__}")
        raise typer.Exit()

    if ctx.invoked_subcommand is None:
        setup_opentelemetry()
        session = REPLSession(manifest_source=manifest)
        session.start()


if __name__ == "__main__":
    app()

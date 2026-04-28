"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, _ref) => {
  const chartContainerRef = React.useRef<HTMLDivElement>(null)

  const [activeChart, setActiveChart] = React.useState<string | null>(null)

  const ChartTooltip = React.useMemo(() => {
    return ({ ...props }) => {
      const { active, payload } = props

      if (active && payload && payload.length) {
        const newActiveChart = payload[0].dataKey as string
        if (activeChart !== newActiveChart) {
          setActiveChart(newActiveChart)
        }
      }

      return null
    }
  }, [activeChart])

  React.useEffect(() => {
    const chart = chartContainerRef.current
    if (!chart) {
      return
    }

    const style = document.createElement("style")
    style.innerHTML = Object.entries(THEMES)
      .map(
        ([theme, selector]) => `
${selector} [data-chart] {
  --theme: ${theme};
  ${Object.entries(config)
    .map(([key, chartConfig]) => {
      const color =
        chartConfig.theme?.[theme as keyof typeof THEMES] || chartConfig.color
      return color ? `--color-${key}: ${color};` : null
    })
    .join("\n")}
}
`
      )
      .join("\n")
    chart.append(style)

    return () => {
      style.remove()
    }
  }, [config])

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={id || "chart"}
        ref={chartContainerRef}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-legend-item_text]:text-muted-foreground [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-reference-line_line]:stroke-border [&_.recharts-surface]:outline-none [&_.recharts-tooltip-cursor]:stroke-border [&_.recharts-tooltip-wrapper]:text-sm",
          className
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
        <RechartsPrimitive.Tooltip
          content={ChartTooltip}
          wrapperStyle={{ outline: "none" }}
          isAnimationActive={false}
          cursor={false}
          allowEscapeViewBox={{ x: true, y: true }}
          position={{ y: 0 }}
        />
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign">
>(({ className, payload, verticalAlign, ...props }, ref) => {
  const { config } = useChart()

  if (!payload || !payload.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-4" : "pt-4",
        className
      )}
      {...props}
    >
      {payload.map((item) => {
        const key = item.dataKey as string
        const chartConfig = config[key]

        if (!chartConfig) {
          return null
        }

        const color =
          chartConfig.theme?.["light"] ||
          chartConfig.color ||
          item.color

        return (
          <div
            key={item.value}
            className={cn(
              "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            )}
          >
            {chartConfig.icon ? (
              <chartConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: color,
                }}
              />
            )}
            {chartConfig.label}
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegend"

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      indicator?: "line" | "dot" | "dashed"
      hideLabel?: boolean
      hideIndicator?: boolean
      labelKey?: string
      nameKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload || payload.length === 0) {
        return null
      }

      if (label) {
        return label
      }

      if (labelFormatter) {
        return labelFormatter(payload[0].value, payload)
      }

      if (labelKey && payload[0].payload) {
        return payload[0].payload[labelKey]
      }

      return null
    }, [label, labelFormatter, payload, hideLabel, labelKey])

    if (!active || !payload || payload.length === 0) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
        )}
      >
        {!hideLabel && tooltipLabel ? (
          <div className={cn("font-medium", labelClassName)}>
            {tooltipLabel}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const chartConfig = config[key]
            const indicatorColor =
              color ||
              item.color ||
              chartConfig.theme?.["light"] ||
              chartConfig.color

            return (
              <div
                key={i}
                className={cn(
                  "flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  className
                )}
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0",
                      {
                        "border-l border-dashed": indicator === "dashed",
                        "w-0.5": indicator === "line",
                      },
                      {
                        "h-2.5 w-2.5 rounded-full": indicator === "dot",
                      }
                    )}
                    style={{
                      background: indicatorColor,
                    }}
                  />
                )}
                <div className="flex flex-1 justify-between leading-none">
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">
                      {chartConfig?.label || item.name}
                    </span>
                  </div>
                  {item.value && (
                    <span className="font-medium text-foreground">
                      {formatter
                        ? formatter(item.value, item.name || '', item, i, payload)
                        : `${item.value}`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
}

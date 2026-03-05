import React from "react";
import { Environment } from "../../../../../../../@ebowwa/codespaces-types/compile";
import { useCosts } from "../../hooks/useCosts";

interface CostEstimateProps {
  environments: Environment[];
}

/**
 * CostEstimate component that uses the backend costs API
 */
export function CostEstimate({ environments }: CostEstimateProps) {
  const { costs, loading, error } = useCosts(environments, {
    autoRefresh: true,
    refreshInterval: 60000, // Refresh every minute
  });

  // Show loading state while fetching costs
  if (loading && !costs) {
    return (
      <div className="cost-estimate">
        <h2>Cost Estimate</h2>
        <div className="loading-state">Loading pricing information...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="cost-estimate">
        <h2>Cost Estimate</h2>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  if (!costs) {
    return (
      <div className="cost-estimate">
        <h2>Cost Estimate</h2>
        <div className="empty-state">No cost data available</div>
      </div>
    );
  }

  return (
    <div className="cost-estimate">
      <h2>Cost Estimate</h2>

      <div className="cost-summary">
        <div className="cost-card">
          <span className="cost-label">Running Environments</span>
          <span className="cost-value">{costs.runningCount}</span>
        </div>

        <div className="cost-card">
          <span className="cost-label">Estimated Monthly</span>
          <span className="cost-value cost-price">
            €{(costs.totalMonthly ?? 0).toFixed(2)}
          </span>
        </div>

        <div className="cost-card">
          <span className="cost-label">Estimated Hourly</span>
          <span className="cost-value cost-price">
            €{(costs.totalHourly ?? 0).toFixed(4)}
          </span>
        </div>
      </div>

      <div className="cost-breakdown">
        <h3>Breakdown by Environment</h3>

        {costs.breakdown.length === 0 ? (
          <p className="empty-state">No environments to calculate costs</p>
        ) : (
          <table className="cost-table">
            <thead>
              <tr>
                <th>Environment</th>
                <th>Type</th>
                <th>Status</th>
                <th>Price/Month</th>
              </tr>
            </thead>
            <tbody>
              {costs.breakdown.map((item) => {
                const isRunning = item.status === "running";

                return (
                  <tr key={item.environmentId} className={!isRunning ? "dimmed" : ""}>
                    <td>{item.environmentName}</td>
                    <td>{item.serverType}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="price-cell">
                      {isRunning ? `€${(item.priceMonthly ?? 0).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="cost-disclaimer">
        * Estimates based on Hetzner standard pricing. Actual costs may vary
        based on usage, traffic, and additional services.
      </p>
    </div>
  );
}

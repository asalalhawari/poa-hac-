/**
 * ============================================================================
 * HTTP SERVER STARTUP
 * ============================================================================
 */

import { app } from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 HAC Signal Investigation Service Running on Port ${PORT}`);
  console.log(`🏥 Health Check:      http://localhost:${PORT}/api/health`);
  console.log(`📋 Investigation API: http://localhost:${PORT}/api/hac/claims/CLM-2024-001/investigation`);
  console.log(`📑 Review Queue API:  http://localhost:${PORT}/api/hac/review-queue`);
  console.log(`⚙️  Config Service:    http://localhost:${PORT}/api/hac/config`);
  console.log(`=======================================================`);
});

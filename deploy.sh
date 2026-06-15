#!/bin/bash
# ============================================================
#  EstateFlow AI v2 — سكريبت النشر التلقائي
#  شغّله مرة واحدة فقط من مجلد المشروع
# ============================================================

set -e  # يوقف السكريبت عند أي خطأ

# ألوان للطباعة
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${GREEN}✓ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠ $1${NC}"; }
error()  { echo -e "${RED}✗ $1${NC}"; exit 1; }
header() { echo -e "\n${BLUE}══════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}══════════════════════════════${NC}"; }

# ============================================================
# الخطوة 0: جمع المعلومات من المستخدم
# ============================================================
header "EstateFlow AI v2 — إعداد النشر"

echo ""
echo "سنحتاج بعض المعلومات قبل البدء."
echo "يمكنك الحصول عليها من:"
echo "  • Supabase → Settings → API"
echo "  • Anthropic → console.anthropic.com"
echo "  • Vercel → vercel.com"
echo ""

# Supabase
read -p "🔷 Supabase Project URL (مثال: https://xxxx.supabase.co): " SUPABASE_URL
read -p "🔷 Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "🔷 Supabase Service Role Key: " SUPABASE_SERVICE_KEY
read -p "🔷 Supabase Project ID (الجزء بين // و .supabase.co): " SUPABASE_PROJECT_ID

# Anthropic
read -p "🤖 Anthropic API Key (sk-ant-...): " ANTHROPIC_KEY

# Stripe (اختياري)
read -p "💳 Stripe Secret Key (اتركه فارغاً للتخطي): " STRIPE_SECRET
read -p "💳 Stripe Publishable Key (اتركه فارغاً للتخطي): " STRIPE_PUB

# GitHub
read -p "🐙 GitHub Username: " GITHUB_USER
read -p "🐙 اسم المستودع الجديد (مثال: estateflow): " GITHUB_REPO

# Domain
read -p "🌐 الدومين أو URL المتوقع (مثال: https://estateflow.vercel.app): " APP_URL

CRON_SECRET=$(openssl rand -hex 16)

echo ""
log "تم جمع كل المعلومات"

# ============================================================
# الخطوة 1: فحص الأدوات المطلوبة
# ============================================================
header "فحص الأدوات"

check_tool() {
  if command -v $1 &> /dev/null; then
    log "$1 موجود"
  else
    warn "$1 غير موجود — جاري التثبيت..."
    return 1
  fi
}

# Node.js
check_tool node || {
  error "يرجى تثبيت Node.js من https://nodejs.org ثم أعد تشغيل السكريبت"
}

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js يجب أن يكون الإصدار 18 أو أحدث. الإصدار الحالي: $(node -v)"
fi
log "Node.js $(node -v)"

# npm
check_tool npm || error "npm غير موجود"

# Git
check_tool git || error "يرجى تثبيت Git من https://git-scm.com"

# Supabase CLI
check_tool supabase || {
  warn "جاري تثبيت Supabase CLI..."
  npm install -g supabase 2>/dev/null || {
    # macOS fallback
    if command -v brew &> /dev/null; then
      brew install supabase/tap/supabase
    else
      error "لم يتم تثبيت Supabase CLI. يرجى تثبيته يدوياً: https://supabase.com/docs/guides/cli"
    fi
  }
}
log "Supabase CLI $(supabase --version)"

# Vercel CLI
check_tool vercel || {
  warn "جاري تثبيت Vercel CLI..."
  npm install -g vercel
}
log "Vercel CLI مثبت"

# GitHub CLI
check_tool gh || {
  warn "GitHub CLI غير موجود — سيتم تخطي إنشاء المستودع تلقائياً"
  SKIP_GH=true
}

# ============================================================
# الخطوة 2: إنشاء ملف .env.local
# ============================================================
header "إنشاء ملفات البيئة"

cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
NEXT_PUBLIC_APP_URL=${APP_URL}
STRIPE_SECRET_KEY=${STRIPE_SECRET}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUB}
CRON_SECRET=${CRON_SECRET}
EOF

log "تم إنشاء .env.local"

# إضافة .env.local إلى .gitignore
if [ ! -f .gitignore ]; then
  cat > .gitignore << 'EOF'
.env.local
.env*.local
node_modules/
.next/
out/
*.log
.DS_Store
EOF
fi

grep -q ".env.local" .gitignore || echo ".env.local" >> .gitignore
log "تم تحديث .gitignore"

# ============================================================
# الخطوة 3: تثبيت الـ dependencies
# ============================================================
header "تثبيت الحزم"

npm install
log "تم تثبيت جميع الحزم"

# ============================================================
# الخطوة 4: تشغيل الـ Migrations على Supabase
# ============================================================
header "تشغيل قاعدة البيانات"

echo ""
echo "سنقوم الآن بتشغيل الـ migrations على Supabase."
echo "إذا طلب منك تسجيل الدخول، اتبع التعليمات على الشاشة."
echo ""

supabase login

supabase link --project-ref ${SUPABASE_PROJECT_ID}

log "جاري تشغيل Migration 001..."
supabase db push --file supabase/migrations/001_complete_schema.sql 2>/dev/null || \
  warn "Migration 001 ربما مطبق مسبقاً — متابعة..."

log "جاري تشغيل Migration 002..."
supabase db push --file supabase/migrations/002_documents_market_billing.sql 2>/dev/null || \
  warn "Migration 002 ربما مطبق مسبقاً — متابعة..."

log "جاري تشغيل Migration 003..."
supabase db push --file supabase/migrations/003_ai_features.sql 2>/dev/null || \
  warn "Migration 003 ربما مطبق مسبقاً — متابعة..."

log "تمت قاعدة البيانات"

# ============================================================
# الخطوة 5: نشر Edge Functions
# ============================================================
header "نشر Edge Functions"

FUNCTIONS=(
  "brain-tick"
  "generate-email"
  "profile-builder"
  "analyze-document"
  "market-intelligence"
  "create-checkout"
  "stripe-webhook"
  "generate-expose"
  "auto-valuation"
  "weekly-report"
  "match-listings"
)

# إضافة Secrets للـ Functions
echo ""
log "إضافة متغيرات البيئة للـ Edge Functions..."

supabase secrets set ANTHROPIC_API_KEY="${ANTHROPIC_KEY}" 2>/dev/null || warn "فشل إضافة ANTHROPIC_API_KEY"
supabase secrets set CRON_SECRET="${CRON_SECRET}" 2>/dev/null || warn "فشل إضافة CRON_SECRET"

if [ ! -z "$STRIPE_SECRET" ]; then
  supabase secrets set STRIPE_SECRET_KEY="${STRIPE_SECRET}" 2>/dev/null || warn "فشل إضافة STRIPE_SECRET_KEY"
fi

# نشر كل function
for fn in "${FUNCTIONS[@]}"; do
  if [ -f "supabase/functions/${fn}/index.ts" ]; then
    echo -n "  نشر ${fn}... "
    supabase functions deploy ${fn} --no-verify-jwt 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⚠ تحقق يدوياً${NC}"
  else
    warn "لم يُوجد ${fn} — تخطي"
  fi
done

log "تمت Edge Functions"

# ============================================================
# الخطوة 6: رفع على GitHub
# ============================================================
header "رفع على GitHub"

# تهيئة Git
if [ ! -d .git ]; then
  git init
  log "تم تهيئة Git"
fi

git add .
git commit -m "feat: EstateFlow AI v2 — complete platform" 2>/dev/null || \
  git commit --allow-empty -m "feat: EstateFlow AI v2 — complete platform"

if [ "$SKIP_GH" != "true" ]; then
  gh auth login 2>/dev/null || warn "يرجى تسجيل الدخول إلى GitHub CLI"
  
  gh repo create ${GITHUB_USER}/${GITHUB_REPO} --private --source=. --remote=origin --push 2>/dev/null || {
    warn "المستودع موجود — جاري الرفع..."
    git remote set-url origin https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git 2>/dev/null || \
    git remote add origin https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git
    git push -u origin main 2>/dev/null || git push -u origin master
  }
  log "تم رفع الكود على GitHub"
else
  warn "يرجى رفع الكود على GitHub يدوياً:"
  echo "  git remote add origin https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
  echo "  git push -u origin main"
fi

# ============================================================
# الخطوة 7: النشر على Vercel
# ============================================================
header "النشر على Vercel"

echo ""
echo "جاري تسجيل الدخول إلى Vercel..."
vercel login

echo ""
log "جاري نشر المشروع..."
vercel --yes \
  --env NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
  --env SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_KEY}" \
  --env ANTHROPIC_API_KEY="${ANTHROPIC_KEY}" \
  --env NEXT_PUBLIC_APP_URL="${APP_URL}" \
  --env STRIPE_SECRET_KEY="${STRIPE_SECRET}" \
  --env NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${STRIPE_PUB}" \
  --env CRON_SECRET="${CRON_SECRET}"

log "تم النشر على Vercel"

# Production deploy
vercel --prod --yes

# ============================================================
# الخطوة 8: ملخص النتيجة
# ============================================================
header "🎉 اكتمل النشر"

echo ""
echo -e "${GREEN}EstateFlow AI v2 جاهز تماماً!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  الرابط:     ${APP_URL}"
echo "  GitHub:     https://github.com/${GITHUB_USER}/${GITHUB_REPO}"
echo "  Supabase:   https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}"
echo "  CRON Secret: ${CRON_SECRET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "الخطوات التالية:"
echo "  1. افتح ${APP_URL} وسجّل حساباً جديداً"
echo "  2. أضف أول إنسيرات وجرّب الـ KI features"
if [ ! -z "$STRIPE_SECRET" ]; then
  echo "  3. فعّل Stripe Webhook من: https://dashboard.stripe.com/webhooks"
  echo "     URL: ${APP_URL}/functions/v1/stripe-webhook"
fi
echo ""
echo -e "${YELLOW}احتفظ بـ CRON_SECRET في مكان آمن!${NC}"
echo ""

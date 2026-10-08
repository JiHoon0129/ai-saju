const RefundPage = () => {
  return (
    <main className="min-h-screen bg-white px-5 py-10 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold">환불정책</h1>

        <section className="space-y-8 text-sm leading-7">
          <div>
            <h2 className="mb-2 text-lg font-semibold">1. 기본 원칙</h2>
            <p>
              본 서비스는 AI를 이용한 사주 분석 및 디지털 콘텐츠를 제공하는
              서비스입니다. 결제 전 상품의 내용과 가격을 충분히 확인하시기
              바랍니다.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">2. 환불 가능 기준</h2>
            <p>
              결제 후 디지털 분석 결과가 제공되기 전에는 결제 취소 및 환불을
              요청할 수 있습니다.
            </p>
            <p className="mt-2">
              결제 후 사주 분석 결과가 정상적으로 제공된 경우에는 디지털
              콘텐츠의 특성상 원칙적으로 환불이 제한될 수 있습니다.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">3. 서비스 오류</h2>
            <p>
              결제는 정상적으로 완료되었으나 시스템 오류 등으로 분석 결과가
              정상적으로 제공되지 않은 경우에는 고객센터를 통해 문의해
              주시기 바랍니다.
            </p>
            <p className="mt-2">
              서비스 이용 기록 및 결제 내역을 확인한 후 적절한 조치를
              진행합니다.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">4. 중복 결제</h2>
            <p>
              동일한 상품이 중복 결제된 경우 결제 내역을 확인한 후 중복
              결제된 금액에 대해 환불을 진행합니다.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">5. 환불 방법</h2>
            <p>
              환불이 승인된 경우 결제 수단 및 결제사의 정책에 따라 환불이
              처리됩니다.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">6. 문의</h2>
            <p>
              환불 및 결제 관련 문의는 서비스 내 안내된 고객 문의 방법을
              이용해 주시기 바랍니다.
            </p>
          </div>

          <div className="border-t pt-6 text-gray-500">
            <p>본 환불정책은 서비스 운영 과정에서 변경될 수 있습니다.</p>
          </div>
        </section>

        <div className="mt-10">
          <a
            href="/"
            className="inline-block rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white"
          >
            사주 서비스로 돌아가기
          </a>
        </div>
      </div>
    </main>
  );
};

export default RefundPage;

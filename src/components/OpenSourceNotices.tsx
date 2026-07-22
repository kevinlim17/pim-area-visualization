interface OpenSourceItem {
  name: string;
  version?: string;
  license: string;
  purpose: string;
  url: string;
}

const OPEN_SOURCE_ITEMS: OpenSourceItem[] = [
  {
    name: "React",
    version: "18.3.1",
    license: "MIT",
    purpose: "사용자 인터페이스",
    url: "https://github.com/facebook/react",
  },
  {
    name: "React DOM",
    version: "18.3.1",
    license: "MIT",
    purpose: "브라우저 렌더링",
    url: "https://github.com/facebook/react",
  },
  {
    name: "Three.js",
    version: "0.169.0",
    license: "MIT",
    purpose: "3차원 그래픽",
    url: "https://github.com/mrdoob/three.js",
  },
  {
    name: "React Three Fiber",
    version: "8.18.0",
    license: "MIT",
    purpose: "React 기반 Three.js 렌더러",
    url: "https://github.com/pmndrs/react-three-fiber",
  },
  {
    name: "React Three Drei",
    version: "9.122.0",
    license: "MIT",
    purpose: "3차원 시각화 도우미",
    url: "https://github.com/pmndrs/drei",
  },
  {
    name: "d3-scale",
    version: "4.0.2",
    license: "ISC",
    purpose: "축 값과 화면 좌표 매핑",
    url: "https://github.com/d3/d3-scale",
  },
  {
    name: "나눔스퀘어 네오",
    license: "SIL OFL 1.1",
    purpose: "웹폰트",
    url: "https://help.naver.com/service/30016/contents/18088?lang=ko&osType=PC",
  },
];

export default function OpenSourceNotices() {
  return (
    <div className="open-source-notices">
      <p>
        이 사이트는 아래 오픈소스를 직접 사용합니다. 각 항목을 선택하면 프로젝트 또는
        라이선스 안내 페이지가 열립니다.
      </p>
      <ul>
        {OPEN_SOURCE_ITEMS.map((item) => (
          <li key={item.name}>
            <a href={item.url} target="_blank" rel="noreferrer">
              <strong>{item.name}</strong>
              {item.version && <span className="open-source-version">v{item.version}</span>}
            </a>
            <span className="open-source-license">{item.license}</span>
            <small>{item.purpose}</small>
          </li>
        ))}
      </ul>
      <p className="open-source-project-license">
        PIM Flow Graph는{" "}
        <a
          href="https://github.com/kevinlim17/pim-area-visualization/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
        >
          MIT License
        </a>
        로 공개됩니다. 전체 패키지 버전은 저장소의 package-lock.json에서 확인할 수 있습니다.
      </p>
    </div>
  );
}
